<?php
  
  echo $codigo = $_GET['cod'];
  require('connect.php');
  $busca = mysqli_query($con, "SELECT * FROM `tb_cliente` WHERE `codigo` = '$codigo'");
  
//   var_dump($busca);
  $contato = mysqli_fetch_array($busca);
  unset($contato['foto']);
  
  if(mysqli_query($con, "DELETE FROM `tb_cliente` WHERE `codigo` = '$codigo'")){
    $msg = "Registro foi deletado com sucesso";
  }else{
    $msg = "Falha ao deletar registro";
   }
   
   session_start();
   $_SESSION['msg'] = $msg;
   header("location:listar.php");








?>