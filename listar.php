<?php require('sec.php'); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    
    <title>Lista de Usuarios Cadastrados</title>
</head>
<body>

<?php include('menu.php'); ?>

    <?php
        @session_start();
        if(isset($_SESSION['msg'])){
            echo "<p class=alert>$_SESSION[msg]</p>";
            unset($_SESSION['msg']);          
        }
        require('connect.php');
        $contatos = mysqli_query($con, "Select * from `tb_cliente`");
        
        while($contato=mysqli_fetch_array($contatos)){
            echo "<div class=box>";
            echo "<p><img src= $contato[foto]></p>";
            echo "<p>Código: $contato[codigo]</p>";
            echo "<p>Nome: $contato[nome]</p>";
            echo "<p>Email: $contato[email]</p>";
            echo "<p>Telefone: $contato[telefone]</p>";
            echo "<p>Data/Nasc: $contato[data]</p>";
            echo "<p>CPF: $contato[cpf]</p>";
            echo "<p class=alterar><a href=alterar.php?cod=$contato[codigo]>Alterar</a></p>";
            echo "<p class=alterar><a href=javascript:excluir($contato[codigo])>Excluir</a></p>";
            echo "</div>";
        }

    ?>
    

<script> 
   function excluir(codigo) {
    resp = confirm('Deseja excluir o registo '+codigo+'?')
    if(resp == true){
     window.location = "excluir.php?cod=" +codigo; 
     }
   }
</script>
    
</body>
</html>